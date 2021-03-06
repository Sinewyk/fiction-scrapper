import assert from 'assert';
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
const CHAPTER_REQUEST_TYPE = 'CHAPTER_REQUEST_TYPE';

export function makeInitialState(initialUrl) {
	return {
		id: initialUrl,
		status: INIT_STATUS,
		chapters: [],
	};
}

const findIndex = (requestNumber, prevState) => {
	const foundIndex = R.findIndex(R.propEq('number', requestNumber), prevState.chapters);
	assert.notEqual(foundIndex, -1, 'Sanity check: index should be found');
	return foundIndex;
};

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

	const fetchInfos$ = bookConf$.map(bookConf => {
		return {
			HTTP: xs.of({
				url: bookConf.givenUrl,
				category: INFOS_REQUEST_TYPE,
				lazy: true,
			}),
			state: xs.of(prevState => ({
				...prevState,
				status: FETCHING_INFO_STATUS,
			})),
		};
	});

	const infosResponseHandler$ = sources.HTTP.select(INFOS_REQUEST_TYPE)
		.map(response$ => response$.replaceError(err => xs.of(err.response))) // Just passthru errors
		.flatten()
		.compose(sampleCombine(bookConf$))
		.map(([res, bookConf]) => {
			const chaptersToDl = [1, 2, 3, 4, 5];
			const infos = bookConf.getInfos(res);
			return {
				HTTP: xs.from(
					chaptersToDl.map(x => ({
						url: bookConf.getChapterUrl(x),
						category: CHAPTER_REQUEST_TYPE,
						number: x,
						lazy: true,
					})),
				),
				state: xs.of(prevState => ({
					...prevState,
					infos,
					status: DOWNLOADING_STATUS,
					chapters: chaptersToDl.map(x => ({
						number: x,
						status: DOWNLOADING_STATUS,
					})),
				})),
				console: xs.of(JSON.stringify(infos, null, '  ')),
			};
		});

	const responseHandler$ = sources.HTTP.select(CHAPTER_REQUEST_TYPE)
		.map(response$ => response$.replaceError(err => xs.of(err.response))) // Just passthru errors
		.compose(flattenConcurrently)
		.compose(sampleCombine(bookConf$))
		.map(([res, bookConf]) => {
			const requestNumber = res.request.number;

			// The meat of the download is done but
			// @TODO (sinewyk): in case of 'in the middle' 404
			// retry ... or other strategies depending on host, which is why dep Injection
			// go back to 5 concurrent requests
			// and try to warn user of missing chapter in the middle if still 404

			if (res.status === 200) {
				const HTTPReq$ = sources.state.stream.take(1).map(nextState => {
					// @FIXME: dep injection, give state to getChapterUrl
					const nextChapterNumber = nextState.chapters.length + 1;
					return {
						number: nextChapterNumber,
						url: bookConf.getChapterUrl(nextChapterNumber),
						category: CHAPTER_REQUEST_TYPE,
						lazy: true,
					};
				});
				return {
					state: xs.merge(
						xs.of(prevState => {
							const foundIndex = findIndex(requestNumber, prevState);
							return R.evolve(
								{
									chapters: R.pipe(
										R.adjust(foundIndex, prev => ({
											...prev,
											status: 200,
											...bookConf.getChapterFromResponse(res),
										})),
										R.append({
											number: prevState.chapters.length + 1,
											status: DOWNLOADING_STATUS,
										}),
									),
								},
								prevState,
							);
						}),
					),
					HTTP: HTTPReq$,
					console: HTTPReq$.map(req => [
						`Sending request ${req.number} ${req.url}\n`,
						`${res.status} on ${res.request.url}\n`,
					]),
				};
			} else if (res.status === 404) {
				return {
					state: xs.of(prevState => {
						const foundIndex = findIndex(requestNumber, prevState);
						return R.evolve({
							chapters: R.adjust(foundIndex, R.evolve({ status: R.always(404) })),
						})(prevState);
					}),
					console: xs.of(`${res.status} on ${res.request.url}\n`),
				};
			} else {
				return {
					state: xs.of(prevState => {
						const foundIndex = findIndex(requestNumber, prevState);
						return R.evolve({
							chapters: R.adjust(foundIndex, R.evolve({ status: R.always(res.status) })),
						})(prevState);
					}),
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

	const ended$ = sources.state.stream.filter(state => state.status === OK_STATUS);

	return {
		state: xs.merge(
			sources.initialData.map(url => () => makeInitialState(url)),
			splitState(fetchInfos$),
			splitState(infosResponseHandler$),
			splitState(responseHandler$),
			end$,
		),
		HTTP: xs.merge(
			splitHTTP(fetchInfos$),
			splitHTTP(infosResponseHandler$),
			splitHTTP(responseHandler$),
		),
		console: xs.merge(splitConsole(infosResponseHandler$), splitConsole(responseHandler$)),
		endState: ended$
			.map(() => sources.state.stream)
			.flatten()
			.take(1),
	};
}
