/**
 * SubPageTemplateModal — bottom-sheet picker for creating a sub-page from a
 * predefined template. Selecting a template hands it back to the caller (which
 * creates the sub-page) and closes the sheet.
 */

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { SUB_PAGE_TEMPLATES, type SubPageTemplate } from "@/core/sub-page/templates";

const SubPageTemplateModal = ({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: SubPageTemplate) => void;
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-lg">
        <DrawerHeader className="pb-2">
          <DrawerTitle>New sub-page from template</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-4 pt-3">
          {SUB_PAGE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template)}
              className="flex flex-col items-start gap-0.5 rounded-md border px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="text-sm font-medium">{template.name}</span>
              <span className="text-xs text-muted-foreground">{template.description}</span>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SubPageTemplateModal;
