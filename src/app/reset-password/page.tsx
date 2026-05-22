import { redirect } from "next/navigation";

export default function ResetPasswordCompatibilityPage() {
  redirect("/auth/reset-password");
}
