import xs from 'xstream';
import isolate from '@cycle/isolate';
import { makeCollection } from '@cycle/state';
import { Single, makeInitialState } from './Single';

const Books = makeCollection({
	item: Single,
	itemKey: state => state.id,
	itemScope: key => key,
	collectSinks: instances => {
		return {
			state: instances.pickMerge('state'),
			console: instances.pickMerge('console'),
			HTTP: instances.pickMerge('HTTP'),
			endState: instances.pickMerge('endState'),
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

	return {
		state: reducer$,
		HTTP: booksSinks.HTTP,
		console: xs.merge(booksSinks.console),
		endState: booksSinks.endState,
	};
}
