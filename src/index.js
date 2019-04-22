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

const d = debug('app');

// feed from commander or yargs or something
const data = [
	// 'https://www.wuxiaworld.com/novel/tales-of-demons-and-gods/tdg-chapter-1', // high chapter count with hole in the middle
	'https://www.wuxiaworld.com/novel/heros-shed-no-tears/hsnt-chapter-0', // low chapter count
];

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
		const content = state.chapters
			.filter(x => x.status === 200)
			.reduce((acc, chapter) => acc + chapter.content, state.header);

		return {
			state,
			content: `<div>\n${content}\n</div>`,
		};
	})
	.map(({ state, content }) => xs.fromPromise(fs.writeFile('placeholder.html', content)))
	.flatten()
	.subscribe({
		// next: data => console.log(data),
		error: console.error,
		complete: () => console.log('complete'),
	});
