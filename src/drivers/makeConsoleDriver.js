import xs from 'xstream';

export function makeConsoleDriver(options = {}) {
	return function consoleDriver(sink) {
		if (!sink) {
			return xs.empty();
		}

		sink.subscribe({
			next: msg => {
				if (Array.isArray(msg)) {
					msg.forEach(val => process.stdout.write(val));
				} else if (typeof msg === 'string') {
					process.stdout.write(msg);
				} else {
					throw new Error('Console sink must be a stream of [string] or string');
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
