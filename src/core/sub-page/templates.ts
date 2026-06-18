/**
 * Sub-page templates — predefined starting points offered in the "new sub-page
 * from template" modal. Plain data (framework-free); the store stamps the chosen
 * template's id onto the created sub-page and uses its name as the initial label.
 */

export interface SubPageTemplate {
  id: string;
  name: string;
  description: string;
}

export const SUB_PAGE_TEMPLATES: SubPageTemplate[] = [
  { id: "plumbing", name: "Plumbing", description: "Basic plumbing checklist and structure." },
  { id: "electrical", name: "Electrical", description: "Basic electrical checklist and structure." },
];
