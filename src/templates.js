import assert from 'assert';

export function chapter({ number, name, content }) {
	if (!content) {
		return '';
	}

	if (!number) {
		return content;
	}

	return `<h1>Chapter ${number}${name ? `: ${name}` : ''}</h1>${content}<br>`;
}

export function header({
	title,
	author = '',
	status = 'In progress',
	summary = '',
	genre = '',
	category = '',
}) {
	assert(title);

	return `<div>
    <div>Story: ${title}</div>
    <div>Author: ${author}</div>
    <div>Status: ${status}</div>
    <div>Summary: ${summary}</div>
    <div>Genre: ${genre}</div>
    <div>Category: ${category}</div>
</div>`;
}
