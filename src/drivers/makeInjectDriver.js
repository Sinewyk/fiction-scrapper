import xs from 'xstream';

export function makeInjectDriver(fn) {
	return function injectDriver() {
		return xs.of(fn);
	};
}
