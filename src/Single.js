import xs from 'xstream';

const INIT_STATUS = 'INIT';
const OK_STATUS = 'OK';
const ERROR_STATUS = 'ERROR';

export default function Single(sources) {
	const bookConf$ = xs
		.combine(sources.getBookConf, sources.initialData)
		.map(([getBookConf, url]) => getBookConf(url));

	const initialHttpRequest$ = bookConf$
		.map(bookConf => {
			if (bookConf.shouldFetchInfos) {
				return xs.of({ url: bookConf.givenUrl });
			}
			return xs.empty();
		})
		.flatten();

	const defaultReducer$ = sources.initialData.map(
		id =>
			function defaultReducer(prevState) {
				if (typeof prevState === 'undefined') {
					return {
						id,
						status: INIT_STATUS,
						chapters: [],
					};
				} else {
					return prevState;
				}
			},
	);

	return {
		state: defaultReducer$,
		HTTP: initialHttpRequest$,
	};
}
