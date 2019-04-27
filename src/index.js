import assert from 'assert';
import xs from 'xstream';
import { setup } from '@cycle/run';
import { getBookConf } from './hosts';
import { makeConsoleDriver } from './drivers/makeConsoleDriver';
import { makeHTTPDriver } from '@cycle/http';
import { withState } from '@cycle/state';
import { makeInjectDriver } from './drivers/makeInjectDriver';
import { Single } from './Single';
import concat from 'xstream/extra/concat';
import fs from 'fs-extra';
import debug from 'debug';
import { pageTemplate } from './templates';

const d = debug('app');

const data = process.argv.filter(x => x.match(/http(s)?:/));

assert(data.length > 0, 'No url to scrap');

const baseDrivers = {
	getBookConf: makeInjectDriver(getBookConf),
	console: d.enabled ? makeConsoleDriver() : () => xs.empty(),
	HTTP: makeHTTPDriver(),
};

concat(
	...data.map(url =>
		xs
			.of(url)
			.debug(url => console.log(`start ${url}`))
			.map(url => {
				const { run, sinks } = setup(withState(Single), {
					...baseDrivers,
					initialData: () => xs.of(url),
				});

				run();

				return sinks.endState;
			})
			.flatten(),
	),
)
	.debug(data =>
		console.log(`done ${data.id}, ${data.chapters.filter(x => x.status === 200).length} chapters`),
	)
	.map(state => {
		const content = pageTemplate({
			...state,
			chapters: state.chapters.filter(x => x.status === 200),
		});

		return {
			name: `${state.infos.author ? `${state.infos.author} - ` : ''}${state.infos.title}.html`,
			content,
		};
	})
	.map(({ name, content }) => xs.fromPromise(fs.writeFile(name, content)))
	.flatten()
	.subscribe({
		// next: data => console.log(data),
		error: console.error,
		complete: () => console.log('complete'),
	});
