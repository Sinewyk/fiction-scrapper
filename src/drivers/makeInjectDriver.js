import xs from 'xstream';
import concat from 'xstream/extra/concat';

export function makeInjectDriver(fn) {
	return function injectDriver() {
		return concat(xs.of(fn), xs.never()).remember();
	};
}
