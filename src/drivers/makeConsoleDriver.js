import assert from 'assert';
import xs from 'xstream';

const TYPE_ERROR = 'Console sink must be a Stream<String | String[]>';

export function makeConsoleDriver(options = {}) {
	return function consoleDriver(sink) {
		if (!sink) {
			return xs.empty();
		}

		sink.subscribe({
			next: msg => {
				if (Array.isArray(msg)) {
					msg.forEach(val => {
						// Typescript to the rescue later ?
						assert.equal(typeof val, 'string', TYPE_ERROR);
						process.stdout.write(val);
					});
				} else if (typeof msg === 'string') {
					process.stdout.write(msg);
				} else {
					throw new Error(TYPE_ERROR);
				}
			},
			error: err => process.stderr.write(err),
			complete: () => {},
		});

		if (options.listenToStdin) {
			let listenerHandle;
			const stream = xs.create({
				start: listener => {
					listenerHandle = data => {
						const str = data.toString();
						if (str.slice(0, 4) === 'exit') {
							process.exit(0);
						}
						listener.next(str);
					};
					process.stdin.on('data', listenerHandle);
				},
				stop: () => {
					if (listenerHandle) {
						process.stdin.removeListener('data', listenerHandle);
						listenerHandle = null;
					}
				},
			});
			return stream;
		}

		return xs.empty();
	};
}
