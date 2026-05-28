import { redirect } from "next/navigation";

// The import wizard is now integrated into the /transform pipeline
export default function ImportPage() {
  redirect("/transform");
}
