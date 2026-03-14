const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_PATTERN = /\son\w+="[^"]*"/gi;

export const DOMPurify = {
  sanitize(input: string): string {
    return input.replace(SCRIPT_PATTERN, "").replace(EVENT_HANDLER_PATTERN, "");
  }
};
