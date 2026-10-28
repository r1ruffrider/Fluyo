const forbiddenControlPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;

export const githubWorkflowAnnotationTitle = "Fluyo native auth diagnostic";

const checked = (value) => {
  if (typeof value !== "string" || forbiddenControlPattern.test(value)) {
    throw new Error("Workflow annotation text must be a control-free string.");
  }
  return value;
};

export const escapeGithubWorkflowData = (value) =>
  checked(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");

export const escapeGithubWorkflowProperty = (value) =>
  escapeGithubWorkflowData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");

export const githubWorkflowErrorAnnotation = (data) => {
  const annotation = `::error title=${escapeGithubWorkflowProperty(githubWorkflowAnnotationTitle)}::${escapeGithubWorkflowData(data)}`;
  if (annotation.includes("\r") || annotation.includes("\n")) {
    throw new Error("Workflow annotation must be exactly one line.");
  }
  return `${annotation}\n`;
};
