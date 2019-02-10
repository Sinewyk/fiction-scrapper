import Single from '../Single';
import { withState } from '@cycle/state';
import { setup } from '@cycle/run';
import * as assert from 'assert';
import xs from 'xstream';

describe('Single', () => {
	let dispose;

	const drivers = {
		initialData: () =>
			xs.of('https://www.wuxiaworld.com/novel/sovereign-of-the-three-realms/sotr-chapter-943'),
		getBookConf: () =>
			xs.of(givenUrl => ({
				givenUrl,
				shouldFetchInfos: false,
			})),
		HTTP: () => xs.empty(),
	};

	beforeEach(() => {
		if (dispose) {
			dispose();
			dispose = null;
		}
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
					assert.equal(state.status, 'INIT');
					assert.deepStrictEqual(state.chapters, []);
					done();
				},
				error: done,
			});

			dispose = run();
		});

		it('should send a request to fetch infos when needed', done => {
			const { sinks, run } = setup(
				withState(Single),
				Object.assign(drivers, {
					getBookConf: () =>
						xs.of(givenUrl => ({
							givenUrl,
							shouldFetchInfos: true,
						})),
				}),
			);

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
