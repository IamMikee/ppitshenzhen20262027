/*
  Multi-page forms.

  Pages live inside the flat `questions` array as items with type "page"
  (a page break). Everything after a page break, up to the next one, belongs
  to that page; anything before the first page break is page 1.

  Routing:
  - page.next          where to go after this page ("" = next page, a page id, or SUBMIT)
  - radio.goTo[i]      where to go if option i is picked (same values as page.next);
                       overrides page.next. If several radios on a page branch,
                       the last answered one wins.
  Only forward jumps are followed, so a form can never loop.
*/

export const PAGE = "page";
export const SUBMIT = "__submit";

const NON_ANSWERABLE = ["info", "image", PAGE];

export const isAnswerable = (q) => !NON_ANSWERABLE.includes(q.type);

export function splitPages(questions = []) {
  const pages = [];
  let current = { id: null, title: "", description: "", next: "", questions: [] };

  for (const q of questions) {
    if (q.type === PAGE) {
      // Skip the implicit first page when the form starts with a page break
      if (current.id !== null || current.questions.length > 0) pages.push(current);
      current = {
        id: q.id,
        title: q.label || "",
        description: q.description || "",
        next: q.next || "",
        questions: [],
      };
    } else {
      current.questions.push(q);
    }
  }

  pages.push(current);
  return pages;
}

// Index of the page shown after pages[index], or -1 when the form should submit.
export function nextPageIndex(pages, index, answers) {
  const page = pages[index];
  let target = page.next || "";

  for (const q of page.questions) {
    if (q.type !== "radio" || !Array.isArray(q.goTo)) continue;
    const optionIndex = (q.options || []).indexOf(answers[q.id]);
    if (optionIndex !== -1 && q.goTo[optionIndex]) target = q.goTo[optionIndex];
  }

  if (target === SUBMIT) return -1;

  if (target) {
    const targetIndex = pages.findIndex((p) => p.id === target);
    if (targetIndex > index) return targetIndex;
  }

  return index + 1 < pages.length ? index + 1 : -1;
}
