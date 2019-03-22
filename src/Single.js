import xs from 'xstream';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

// Book statuses
const INIT_STATUS = 'INIT_STATUS';
const FETCHING_INFO_STATUS = 'FETCHING_INFO_STATUS';

// Chapter statuses
const OK_STATUS = 'OK_STATUS';
const ERROR_STATUS = 'ERROR_STATUS';

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
		.map(res => {
			if (res.status === 200) {
				return {};
			} else if (res.status === 404) {
				return {};
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
	};
}
