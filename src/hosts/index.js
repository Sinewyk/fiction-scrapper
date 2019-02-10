import assert from 'assert';
import * as wuxiaworld from './www.wuxiaworld.com';
import url from 'url';

const DOMAINS = {
	'www.wuxiaworld.com': wuxiaworld,
};

export const getBookConf = initialUrl => {
	const parsedUrl = url.parse(initialUrl);

	assert(parsedUrl.host, 'Parameter must be an url');

	const bookConfFactory = DOMAINS[parsedUrl.host];

	assert(bookConfFactory, 'Url must be a supported hostname');

	const bookConf = bookConfFactory.createBookConf(initialUrl);

	return {
		...bookConf,
		givenUrl: initialUrl,
	};
};
