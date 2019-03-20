import xs from 'xstream';
import isolate from '@cycle/isolate';
import { makeCollection } from '@cycle/state';
import { Single, makeInitialState } from './Single';
import debounce from 'xstream/extra/debounce';
import debug from 'debug';

const d = debug('app');

const Books = makeCollection({
	item: Single,
	itemKey: state => state.id,
	itemScope: key => key,
	collectSinks: instances => {
		return {
			state: instances.pickMerge('state'),
			console: instances.pickMerge('console'),
			HTTP: instances.pickMerge('HTTP'),
		};
	},
});

export default function main(sources) {
	const initReducer$ = sources.initialData
		.fold((acc, initialUrl) => [...acc, makeInitialState(initialUrl)], [])
		.last()
		.map(initState => () => ({ books: initState }));

	const booksSinks = isolate(Books, 'books')(sources);

	const reducer$ = xs.merge(initReducer$, booksSinks.state);

	const debug$ = d.enabled
		? sources.state.stream
				.map(state => `Current state :\n${JSON.stringify(state, null, '  ')}\n`)
				.compose(debounce(50))
		: xs.empty();

	return {
		state: reducer$,
		HTTP: booksSinks.HTTP,
		console: xs.merge(booksSinks.console, debug$),
	};
}
