import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import sampleCombine from 'xstream/extra/sampleCombine';
import R from 'ramda';

// Book statuses
const INIT_STATUS = 'INIT_STATUS';
const FETCHING_INFO_STATUS = 'FETCHING_INFO_STATUS';

// Chapter statuses
const OK_STATUS = 'OK_STATUS';
const NOT_FOUND_STATUS = 'NOT_FOUND_STATUS';

// Both statuses
const DOWNLOADING_STATUS = 'DOWNLOADING_STATUS';

// Http request type for pivot
const INFOS_REQUEST_TYPE = 'INFOS_REQUEST_TYPE';

export function makeInitialState(initialUrl) {
	return {
		id: initialUrl,
		status: INIT_STATUS,
		chapters: [],
	};
}

const split = whatToSplit => stream =>
	stream
		.map(x => x[whatToSplit])
		.filter(x => !!x)
		.flatten();

const splitState = split('state');
const splitHTTP = split('HTTP');
const splitConsole = split('console');

export function Single(sources) {
	const bookConf$ = xs
		.combine(sources.initialData, sources.getBookConf)
		.map(([url, getBookConf]) => getBookConf(url));

	const responseHandler$ = bookConf$
		.map(bookConf =>
			sources.HTTP.select(bookConf.givenUrl)
				.map(response$ => response$.replaceError(err => xs.of(err.response))) // Just passthru errors
				.compose(flattenConcurrently),
		)
		.flatten()
		.compose(sampleCombine(sources.state.stream, bookConf$))
		.map(([res, state, bookConf]) => {
			const currentNumber = res.request.number;

			// Init is 'done'

			// The meat of the download is done but
			// @TODO (sinewyk): in case of 'in the middle' 404
			// retry ...
			// go back to 5 concurrent requests
			// and try to warn user of missing chapter in the middle if still 404

			// @TODO: figure out "finish" signal, to sort, clean up, and save to html file

			if (res.status === 200) {
				return {
					state: xs.of(prevState => {
						const foundIndex = R.findIndex(R.propEq('number', currentNumber), prevState.chapters);
						return {
							...prevState,
							chapters: [
								...prevState.chapters.slice(0, foundIndex),
								{
									...prevState.chapters[foundIndex],
									status: OK_STATUS,
								},
								...prevState.chapters.slice(foundIndex + 1, prevState.chapters.length),
								{
									number: prevState.chapters.length + 1,
									status: DOWNLOADING_STATUS,
								},
							],
						};
					}),
					HTTP: xs.of({
						number: state.chapters.length + 1,
						category: bookConf.givenUrl,
						url: bookConf.getChapterUrl(state.chapters.length + 1),
					}),
					console: xs.of(`${res.status} on ${res.request.url}\n`),
				};
			} else if (res.status === 404) {
				return {
					state: xs.of(prevState => {
						const foundIndex = R.findIndex(R.propEq('number', currentNumber), prevState.chapters);
						return {
							...prevState,
							chapters: [
								...prevState.chapters.slice(0, foundIndex),
								{
									...prevState.chapters[foundIndex],
									status: NOT_FOUND_STATUS,
									content: res.text,
								},
								...prevState.chapters.slice(foundIndex + 1, prevState.chapters.length),
							],
						};
					}),
				};
			}
		});

	const init$ = bookConf$.map(bookConf => {
		if (bookConf.shouldFetchInfos) {
			return {
				HTTP: xs.of({
					category: bookConf.givenUrl,
					url: bookConf.givenUrl,
					type: INFOS_REQUEST_TYPE,
				}),
				state: xs.of(() => ({
					...makeInitialState(bookConf.givenUrl),
					status: FETCHING_INFO_STATUS,
				})),
			};
		} else {
			const chaptersToDl = [1, 2, 3, 4, 5];
			return {
				HTTP: xs.from(
					chaptersToDl.map(x => ({
						number: x,
						category: bookConf.givenUrl,
						url: bookConf.getChapterUrl(x),
					})),
				),
				state: xs.of(() => ({
					...makeInitialState(bookConf.givenUrl),
					status: DOWNLOADING_STATUS,
					chapters: chaptersToDl.map(x => ({
						number: x,
						status: DOWNLOADING_STATUS,
					})),
				})),
			};
		}
	});

	return {
		state: xs.merge(splitState(init$), splitState(responseHandler$)),
		HTTP: xs.merge(splitHTTP(init$), splitHTTP(responseHandler$)),
		console: xs.merge(splitConsole(responseHandler$)),
	};
}
