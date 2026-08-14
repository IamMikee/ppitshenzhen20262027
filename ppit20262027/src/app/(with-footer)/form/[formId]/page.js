import FormClient from "../../../Components/FormClient";
import { getFormById } from "../../../../services/forms";

export default async function FormPage({ params }) {

  const { formId } = await params;

  if (!formId) {
    return <p>Invalid form URL</p>;
  }

  const form = await getFormById(formId);

  if (!form) {
    return <p>Form not found</p>;
  }

  return <FormClient form={form} />;
}
