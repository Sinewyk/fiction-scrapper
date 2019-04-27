import * as url from 'url';
import R from 'ramda';
import cheerio from 'cheerio';

const DOMAIN_INFOS = {
	protocol: 'https',
	host: 'www.wuxiaworld.com',
};

const N_A = 'N/A';

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
		R.assoc('protocol', 'https:'),
		url.format,
		R.split('-'),
		R.slice(0, -1),
	);

	const parts = process(initialUrl);

	return {
		getChapterUrl: R.pipe(
			R.toString,
			x => [x],
			R.concat(parts),
			R.join('-'),
		),
		getChapterFromResponse: response => {
			const root = cheerio.load(response.text).root();
			defaultFilter(root);
			return {
				name: root.find('.p-15 h4').html(),
				content: root.find('.p-15 .fr-view').html(),
			};
		},
		getInfos: res => {
			const root = cheerio.load(res.text).root();
			const source = url.format(DOMAIN_INFOS);
			return {
				title: root
					.find('.caption h4')
					.first()
					.html(),
				link: url.format({
					...DOMAIN_INFOS,
					pathname: root
						.find('.caption a')
						.first()
						.attr('href'),
				}),
				category: 'wuxia',
				genre: 'fantasy',
				author: '',
				authorlink: '',
				lastUpdated: N_A,
				wordsCount: N_A,
				rating: N_A,
				status: N_A,
				content: N_A,
				source,
				summary: N_A,
			};
		},
	};
}
