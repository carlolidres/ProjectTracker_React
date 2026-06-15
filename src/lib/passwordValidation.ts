import type { Rule } from "antd/es/form";

export const PASSWORD_MIN_LENGTH = 8;

export function validateNewPassword(password: string): string | null {
  const trimmed = password.trim();
  if (!trimmed) return "Password is required.";
  if (trimmed.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return null;
}

export function newPasswordRules(): Rule[] {
  return [
    { required: true, message: "New password is required" },
    {
      validator: async (_, value: string) => {
        const message = validateNewPassword(value ?? "");
        if (message) throw new Error(message);
      },
    },
  ];
}

export function passwordRules(): Rule[] {
  return [
    { required: true, message: "Password is required" },
    { min: PASSWORD_MIN_LENGTH, message: `Use at least ${PASSWORD_MIN_LENGTH} characters.` },
  ];
}
