"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ApiResult } from "@/lib/api";

/** Run a Server Action with pending state and toast feedback. Resolves to the result for field errors. */
export function useActionRunner() {
  const [pending, startTransition] = useTransition();
  function run<T>(action: () => Promise<ApiResult<T>>, success?: string | ((data: T) => string)) {
    return new Promise<ApiResult<T>>((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          const msg = typeof success === "function" ? success(result.data) : success;
          if (msg) toast.success(msg);
        } else if (result.error.code !== "validation_error") {
          toast.error(result.error.message);
        }
        resolve(result);
      });
    });
  }
  return { pending, run };
}
