import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import sampleCombine from 'xstream/extra/sampleCombine';
import R from 'ramda';

// Book statuses
const INIT_STATUS = 'INIT_STATUS';
const FETCHING_INFO_STATUS = 'FETCHING_INFO_STATUS';
const ERROR_STATUS = 'ERROR_STATUS'; // If finished and not only OK and NOT_FOUND for chapters
const OK_STATUS = 'OK_STATUS';

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

const receiveChapterAndAddNext = (index, content) => prevState =>
	R.evolve(
		{
			chapters: R.pipe(
				R.adjust(index, prev => ({
					...prev,
					status: 200,
					content,
				})),
				R.append({
					number: prevState.chapters.length + 1,
					status: DOWNLOADING_STATUS,
				}),
			),
		},
		prevState,
	);

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
		.combine(sources.state.stream.take(1), sources.getBookConf)
		.map(([state, getBookConf]) => getBookConf(state.id))
		.remember();

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

	const responseHandler$ = bookConf$
		.map(bookConf =>
			sources.HTTP.select(bookConf.givenUrl)
				.map(response$ => response$.replaceError(err => xs.of(err.response))) // Just passthru errors
				.compose(flattenConcurrently),
		)
		.flatten()
		.compose(sampleCombine(sources.state.stream, bookConf$))
		.map(([res, state, bookConf]) => {
			const requestNumber = res.request.number;
			const foundIndex = R.findIndex(R.propEq('number', requestNumber), state.chapters);

			// The meat of the download is done but
			// @TODO (sinewyk): in case of 'in the middle' 404
			// retry ...
			// go back to 5 concurrent requests
			// and try to warn user of missing chapter in the middle if still 404

			if (res.status === 200) {
				return {
					state: xs.of(prevState => {
						if (prevState !== state) {
							// @FIXME: race condition
							// answer => https://gist.github.com/Sinewyk/7db1089db3a234afdad2b0bd2ec3ece2 ?
							console.error(new Error('Race condition detected'));
							process.exit(1);
						}
						return receiveChapterAndAddNext(foundIndex, res.text)(prevState);
					}),
					HTTP: xs.of({
						number: state.chapters.length + 1,
						category: bookConf.givenUrl,
						url: bookConf.getChapterUrl(state.chapters.length + 1),
					}),
					console: xs.from([
						`Sending request ${JSON.stringify({
							number: state.chapters.length + 1,
							url: bookConf.getChapterUrl(state.chapters.length + 1),
						})}\n`,
						`${res.status} on ${res.request.url}\n`,
					]),
				};
			} else if (res.status === 404) {
				return {
					state: xs.of(
						R.evolve({
							chapters: R.adjust(foundIndex, R.evolve({ status: R.always(404) })),
						}),
					),
					console: xs.of(`${res.status} on ${res.request.url}\n`),
				};
			} else {
				return {
					state: xs.of(
						R.evolve({
							chapters: R.adjust(foundIndex, R.evolve({ status: R.always(res.status) })),
						}),
					),
					console: xs.of(`${res.status} on ${res.request.url}\n`),
				};
			}
		});

	const end$ = sources.state.stream
		.filter(
			state =>
				state.status === DOWNLOADING_STATUS &&
				state.chapters.filter(x => x.status === DOWNLOADING_STATUS).length === 0,
		)
		.map(() => prevState => ({
			...prevState,
			status: OK_STATUS,
		}));

	const ended$ = sources.state.stream
		.filter(state => state.status === OK_STATUS)
		.map(state => `Finished ${state.id} !\n`);

	return {
		state: xs.merge(splitState(init$), splitState(responseHandler$), end$),
		HTTP: xs.merge(splitHTTP(init$), splitHTTP(responseHandler$)),
		// console: xs.merge(splitConsole(responseHandler$), ended$),
		endState: ended$
			.map(() => sources.state.stream)
			.flatten()
			.take(1),
	};
}
