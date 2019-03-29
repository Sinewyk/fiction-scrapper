import * as url from 'url';
import R from 'ramda';
import cheerio from 'cheerio';
import { chapter, header } from '../templates';

const defaultFilter = root => {
	root.find('.chapter-nav').remove();
	root.find('a').each(function() {
		const $this = cheerio(this);
		const innerHtml = $this.html();
		$this.replaceWith(`<span>${innerHtml}</span>`);
	});
	root.find('script').remove();
};

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
		getChapterContentFromResponse: (number, response) => {
			const root = cheerio.load(response.text).root();
			defaultFilter(root);
			return chapter({
				number,
				name: root.find('.p-15 h4').html(),
				content: root.find('.p-15 .fr-view').toString(),
			});
		},
		getHeader: (state, res) => {
			const root = cheerio.load(res.text).root();
			return header({
				title: root
					.find('.caption h4')
					.first()
					.html(),
			});
		},
	};
}
