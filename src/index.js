import xs from 'xstream';
import { run } from '@cycle/run';
import main from './main';
import { makeConsoleDriver } from './drivers/makeConsoleDriver';
import { makeHTTPDriver } from '@cycle/http';
import { withState } from '@cycle/state';

const drivers = {
	initialData: () =>
		// feed from commander or yargs or something
		xs.fromArray([
			// 'https://www.fanfiction.net/s/12288523/1/Plucking-the-Strings-Redux',
			// 'https://www.fanfiction.net/s/12576821/1/War-Crimes',
			// 'https://jsonplaceholder.typicode.com/users/1',
			// 'http://www.wuxiaworld.com/tde-index/tde-chapter-196/', // right host but 404
			'https://www.wuxiaworld.com/novel/sovereign-of-the-three-realms/sotr-chapter-943', // right host and ok url
		]),
	console: makeConsoleDriver(),
	HTTP: makeHTTPDriver(),
};

run(withState(main), drivers);
