import xs from 'xstream';

export function makeConsoleDriver(options = {}) {
	return function consoleDriver(sink) {
		if (!sink) {
			return xs.empty();
		}

		sink.subscribe({
			next: msg => process.stdout.write(msg),
			error: err => process.stderr.write(err),
			complete: () => {},
		});

		if (options.listenToStdin) {
			const stream =
				xs.create <
				string >
				{
					start: listener =>
						process.stdin.on('data', data => {
							const str = data.toString();
							if (str.slice(0, 4) === 'exit') {
								process.exit(0);
							}
							listener.next(str);
						}),
					stop: () => process.stdin.removeAllListeners(),
				};
			return stream;
		}

		return xs.empty();
	};
}
