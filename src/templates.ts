export interface TemplateVars {
  [key: string]: string;
}

export interface EmailTemplate {
  name: string;
  description: string;
  body: string;
}

export const templates: Record<string, EmailTemplate> = {
  // --- Tiếng Việt (nội bộ) ---

  vi_done: {
    name: "vi_done",
    description: "Thông báo đã hoàn thành yêu cầu (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em đã {{task}} rồi ạ!
{{extra}}`,
  },

  vi_done_check: {
    name: "vi_done_check",
    description: "Đã hoàn thành, nhờ kiểm tra lại (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em {{task}} rồi, {{recipient_short}} thử lại xem được chưa nhé.`,
  },

  vi_update: {
    name: "vi_update",
    description: "Cập nhật tiến độ công việc (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em update, báo lại {{recipient_short}} sau nhé!`,
  },

  vi_acknowledge: {
    name: "vi_acknowledge",
    description: "Xác nhận đã nhận thông tin, sẽ xử lý (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em nắm nội dung rồi ạ.
{{extra}}
Để em đánh giá lại, có kết quả em sẽ update cho {{recipient_short}}!`,
  },

  vi_permission: {
    name: "vi_permission",
    description: "Thông báo đã phân quyền / cấp tài khoản (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em vừa phân quyền rồi ạ!
{{extra}}`,
  },

  vi_account_info: {
    name: "vi_account_info",
    description: "Gửi thông tin tài khoản sau khi setup (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

All done!
{{user_name}}'s CRM access has been set up and permissions have been granted accordingly.
Please find the account details below:

• Username: {{username}}
• Password: {{password}}
{{extra}}`,
  },

  vi_schedule_meeting: {
    name: "vi_schedule_meeting",
    description: "Đề xuất lịch họp (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

{{context}}

Em propose khung giờ {{time}}. {{recipient_short}} xem giúp em giờ này có tiện không nhé?`,
  },

  vi_status_update: {
    name: "vi_status_update",
    description: "Cập nhật trạng thái các hạng mục (tiếng Việt, nội bộ, dài)",
    body: `Hi {{recipient}},

Em đã xem lại các {{items}} và xin cập nhật lại trạng thái các hạng mục ở dưới.

{{details}}

{{recipient_short}} xem giúp em nếu có điểm nào cần điều chỉnh thêm hoặc cần ưu tiên lại thứ tự, em sẽ cập nhật ngay để align với team.`,
  },

  vi_pending: {
    name: "vi_pending",
    description: "Thông báo đang có ràng buộc, chưa cam kết timeline (tiếng Việt, nội bộ)",
    body: `Hi {{recipient}},

Em nắm nội dung mail rồi ạ.

Hiện team IT đang có nhiều pending tasks; đồng thời {{blocker}} nên em chưa thể cam kết timeline triển khai ngay.

Để em đánh giá lại, có kết quả em sẽ update cho {{recipient_short}}!`,
  },

  // --- English (professional) ---

  en_done: {
    name: "en_done",
    description: "Task completed notification (English, professional)",
    body: `Hi {{recipient}},

All done!
{{details}}`,
  },

  en_update: {
    name: "en_update",
    description: "Progress update (English, professional)",
    body: `Hi {{recipient}},

Please find the update below:

{{details}}

Should you need any further information, please feel free to reach out.`,
  },

  en_acknowledge: {
    name: "en_acknowledge",
    description: "Acknowledge request (English, professional)",
    body: `Hi {{recipient}},

Noted, thank you for the information.

{{extra}}

We will review and get back to you shortly.`,
  },

  en_request: {
    name: "en_request",
    description: "Request support or action (English, professional)",
    body: `Hi {{recipient}},

Could you please support with the following:

{{details}}

Thank you for your support.`,
  },

  en_schedule_meeting: {
    name: "en_schedule_meeting",
    description: "Propose a meeting (English, professional)",
    body: `Hi {{recipient}},

{{context}}

I'd like to propose {{time}} for a meeting to discuss this further.
Please let me know if this works for you.`,
  },

  en_follow_up: {
    name: "en_follow_up",
    description: "Follow up on pending item (English, professional)",
    body: `Hi {{recipient}},

Just following up on {{topic}}.

Could you please provide an update at your earliest convenience?

Thank you.`,
  },
};

export function renderTemplate(templateName: string, vars: TemplateVars): string {
  const tmpl = templates[templateName];
  if (!tmpl) {
    throw new Error(`Template "${templateName}" not found. Available: ${Object.keys(templates).join(", ")}`);
  }

  let body = tmpl.body;
  for (const [key, value] of Object.entries(vars)) {
    body = body.replaceAll(`{{${key}}}`, value);
  }

  // Remove unfilled optional vars
  body = body.replace(/\{\{extra\}\}/g, "");
  body = body.replace(/\n{3,}/g, "\n\n");

  return body.trim();
}

export function listTemplates(): Array<{ name: string; description: string }> {
  return Object.values(templates).map((t) => ({
    name: t.name,
    description: t.description,
  }));
}
