import { Single } from '../Single';
import { withState } from '@cycle/state';
import { setup } from '@cycle/run';
import { mockHTTPDriver } from '@cycle/http/lib/cjs/mockHTTPDriver';
import * as assert from 'assert';
import xs from 'xstream';

const getChapterUrl = x => String(x);

const DUMMY_INITIAL_URL = 'some_initial_url';

describe('Single', () => {
	let dispose;

	const drivers = {
		initialData: () => xs.of(DUMMY_INITIAL_URL),
		getBookConf: () =>
			xs.of(givenUrl => ({
				givenUrl,
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

			sources.state.stream.take(1).addListener({
				next: state => {
					assert.equal(state.id, DUMMY_INITIAL_URL);
					assert.equal(state.status, 'INIT_STATUS');
					assert.deepStrictEqual(state.chapters, []);
					done();
				},
				error: done,
			});

			dispose = run();
		});

		it('should send a request to fetch infos', done => {
			const { sinks, run } = setup(withState(Single), {
				...drivers,
				getBookConf: () =>
					xs.of(givenUrl => ({
						givenUrl,
						getChapterUrl,
					})),
			});

			sinks.HTTP.take(1).addListener({
				next: req => {
					assert.equal(req.url, DUMMY_INITIAL_URL);
					assert.equal(req.category, 'INFOS_REQUEST_TYPE');
					done();
				},
				error: done,
			});

			dispose = run();
		});
	});
});
