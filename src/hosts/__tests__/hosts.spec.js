import * as wuxia from '../www.wuxiaworld.com';

import { getBookConf } from '../';

describe('hosts', () => {
	const harness = [
		{
			hostname: 'www.wuxiaworld.com',
			factory: wuxia,
			tests: [
				{
					name: 'getChapterUrl',
					initialUrl: 'https://www.wuxiaworld.com/foo/foo-chapter-1',
					expectedForChapter2: 'https://www.wuxiaworld.com/foo/foo-chapter-2',
				},
				{
					name: 'getChapterUrl force https',
					initialUrl: 'http://www.wuxiaworld.com/foo/foo-chapter-1',
					expectedForChapter2: 'https://www.wuxiaworld.com/foo/foo-chapter-2',
				},
			],
		},
	];

	harness.forEach(testConf => {
		describe(`${testConf.hostname}`, () => {
			testConf.tests.forEach(test => {
				it(`${test.name}`, () => {
					const bookConf = wuxia.createBookConf(test.initialUrl);
					expect(bookConf.getChapterUrl(2)).toEqual(test.expectedForChapter2);
				});
			});
		});
	});
});

describe('#getBookConf', () => {
	it('can find a book conf', () => {
		expect(getBookConf('http://www.wuxiaworld.com/foo/foo-chapter-1')).toBeTruthy();
	});

	it('throws on unrecognized hostname', () => {
		expect(() => getBookConf('http://foo.com')).toThrow();
	});

	it('throws on unrecognized string', () => {
		expect(() => getBookConf('foo')).toThrow();
	});
});
