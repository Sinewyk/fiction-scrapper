import xs from 'xstream';
import { getBookConf } from './hosts';
import dropRepeats from 'xstream/extra/dropRepeats';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

const FETCH_INFOS = 'fetch_infos';
const FETCH_CHAPTER = 'fetch_chapter';

const INIT_STATUS = 'INIT';
const OK_STATUS = 'OK';
const ERROR_STATUS = 'ERROR';

export function makeInitialState(id) {
	return {
		id,
		status: INIT_STATUS,
		chapters: [],
	};
}

/**
function main(sources) {
  const state$ = sources.state.state$;
  const action$ = intent(sources.DOM);
  const reducer$ = model(action$);
  const vdom$ = view(state$);

  const sinks = {
    DOM: vdom$,
    state: reducer$,
  };
  return sinks;
}
*/

// When state changes, we know what to do
// Which should mean launching HTTP request & editing state to reflect in flight stuff ?
function intent(state) {
	const stateId$ = state.stream
		.map(state => state.id)
		.compose(dropRepeats())
		.remember();

	const bookConf$ = stateId$.map(url => getBookConf(url));

	const stateAndConf$ = xs.combine(state.stream, bookConf$.replaceError(xs.empty));

	const httpSink$ = stateAndConf$
		.map(([state, bookConf]) => {
			if (state.status === INIT_STATUS && bookConf.shouldFetchInfos) {
				return xs.of({ url: state.id, category: FETCH_INFOS, lazy: true });
			} else if (state.status !== ERROR_STATUS && state.chapters.length === 0) {
				return xs.from([1, 2, 3, 4, 5]).map(chapterNumber => ({
					url: bookConf.getChapterUrl(chapterNumber),
					category: FETCH_CHAPTER,
					chapterNumber,
				}));
			}
			return xs.empty();
		})
		.flatten();

	const error$ = bookConf$
		.filter(() => false)
		.replaceError(err => xs.of(err))
		.filter(err => err instanceof Error);

	return {
		console: xs
			.combine(stateId$, error$)
			.map(([id, err]) => `Error while fetching ${id}: ${err.message}\n`),
		state: xs.merge(
			error$.map(err => prevState => ({
				...prevState,
				status: ERROR_STATUS,
				err,
			})),
		),
		HTTP: httpSink$,
	};
}

// When http request completes, we know how to change the state
function model(http$) {
	const handleInit$ = http$
		.select()
		.compose(flattenConcurrently)
		.replaceError(err => {
			return xs.of(err.response);
		})
		.map(res => prevState => {
			switch (res.request.category) {
				case FETCH_INFOS:
					return {
						...prevState,
						init: false,
						infos: 'stuff is fetched',
					};
				case FETCH_CHAPTER:
					return {
						...prevState,
						init: false,
						chapters: [
							...prevState.chapters,
							{
								number: res.request.chapterNumber,
								content: res.body,
								status: OK_STATUS,
							},
						],
					};
				default:
					return prevState;
			}
		});

	return {
		state: handleInit$,
		HTTP: xs.empty(),
		console: xs.empty(),
	};
}

// And so my cycle is initialState => intent => model until fetch is over =)
// At the end, just concatenate & transforms and write to disk with a fs driver
export default function Single(sources) {
	const intentSinks = intent(sources.state);
	const modelSinks = model(sources.HTTP);
	return {
		console: xs.merge(intentSinks.console, modelSinks.console),
		HTTP: intentSinks.HTTP,
		state: xs.merge(intentSinks.state, modelSinks.state),
	};
}
