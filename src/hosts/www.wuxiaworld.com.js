import * as url from 'url';
import * as R from 'ramda';

export const hostname = 'wuxiaworld.com';

export function createBookConf(initialUrl) {
	const process = R.pipe(
		url.parse,
		// wuxiaworld supports https, it's broken for assets & shit
		// but we are directly scrapping html so ... force https
		R.assoc('protocol', 'https:'),
		url.format,
		str => str.split('-'),
		strArr => strArr.slice(0, -1),
	);

	const parts = process(initialUrl);

	return {
		shouldFetchInfos: false,
		getChapterUrl: R.pipe(
			R.pipe(
				x => [x.toString()],
				R.concat(parts),
			),
			R.join('-'),
		),
	};
}
