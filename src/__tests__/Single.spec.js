import { Single } from '../Single';
import { withState } from '@cycle/state';
import { setup } from '@cycle/run';
import { mockHTTPDriver } from '@cycle/http/lib/cjs/mockHTTPDriver';
import * as assert from 'assert';
import xs from 'xstream';

const getChapterUrl = x => String(x);

describe('Single', () => {
	let dispose;

	const drivers = {
		initialData: () =>
			xs.of('https://www.wuxiaworld.com/novel/sovereign-of-the-three-realms/sotr-chapter-943'),
		getBookConf: () =>
			xs.of(givenUrl => ({
				givenUrl,
				shouldFetchInfos: false,
				getChapterUrl,
			})),
		HTTP: mockHTTPDriver([
			{
				pattern: '.*',
				fixtures: () => {},
				get: () => {
					return {
						body: '',
						text: '',
						status: 200,
					};
				},
			},
		]),
	};

	beforeEach(() => {
		if (dispose) {
			dispose();
			dispose = null;
		}
	});

	afterAll(() => {
		dispose();
	});

	describe('init', () => {
		it('initialize the state', done => {
			const { sources, run } = setup(withState(Single), drivers);

			sources.state.stream.addListener({
				next: state => {
					assert.equal(
						state.id,
						'https://www.wuxiaworld.com/novel/sovereign-of-the-three-realms/sotr-chapter-943',
					);
					assert.equal(state.status, 'DOWNLOADING_STATUS');
					assert.deepStrictEqual(state.chapters, [
						{
							number: 1,
							status: 'DOWNLOADING_STATUS',
						},
						{
							number: 2,
							status: 'DOWNLOADING_STATUS',
						},
						{
							number: 3,
							status: 'DOWNLOADING_STATUS',
						},
						{
							number: 4,
							status: 'DOWNLOADING_STATUS',
						},
						{
							number: 5,
							status: 'DOWNLOADING_STATUS',
						},
					]);
					done();
				},
				error: done,
			});

			dispose = run();
		});

		it('should send a request to fetch infos when needed', done => {
			const { sinks, run } = setup(withState(Single), {
				...drivers,
				getBookConf: () =>
					xs.of(givenUrl => ({
						givenUrl,
						shouldFetchInfos: true,
						getChapterUrl,
					})),
			});

			sinks.HTTP.addListener({
				next: req => {
					assert.equal(
						req.url,
						'https://www.wuxiaworld.com/novel/sovereign-of-the-three-realms/sotr-chapter-943',
					);
					done();
				},
				error: done,
			});

			dispose = run();
		});
	});
});
