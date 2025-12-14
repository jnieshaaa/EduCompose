import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-neutral-300 placeholder:text-neutral-400 focus-visible:border-primary focus-visible:ring-primary/50 aria-invalid:ring-error-default/20 aria-invalid:border-error-default flex field-sizing-content min-h-16 w-full rounded-rd border bg-white px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 md:text-sm text-neutral-900",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
