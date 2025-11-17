"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

const contactSchema = z.object({
  name: z.string({ message: "名前は必須です" }).min(2, "名前は2文字以上で入力してください"),
  email: z.email("有効なメールアドレスを入力してください"),
  subject: z.enum(
    ["general", "support", "sales", "other"],
    "件名を選択してください",
  ),
  priority: z.enum(["low", "medium", "high"], "優先度を選択してください"),
  interests: z.array(z.string()).min(1, "少なくとも1つ選択してください"),
  message: z.string({ message: "メッセージは必須です" }).min(10, "メッセージは10文字以上で入力してください"),
  newsletter: z.boolean().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<ContactFormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      interests: [],
      newsletter: false,
    },
  });

  const fillDebugData = () => {
    setValue("name", "田中太郎");
    setValue("email", "tanaka@example.com");
    setValue("subject", "support");
    setValue("priority", "high");
    setValue("interests", ["web", "cloud"]);
    setValue("message", "これはデバッグ用のテストメッセージです。フォームの動作確認に使用しています。");
    setValue("newsletter", true);
  };

  const onSubmit = async (data: ContactFormData) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Form data:", data);
    setFormData(data);
    setSubmitted(true);
    reset();
  };

  if (submitted && formData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-4">
            送信完了！
          </h2>
          <p className="text-green-700 dark:text-green-300 mb-4">
            お問い合わせありがとうございます。以下の内容で受け付けました。
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 space-y-2 text-sm">
            <p>
              <span className="font-semibold">名前:</span> {formData.name}
            </p>
            <p>
              <span className="font-semibold">メール:</span> {formData.email}
            </p>
            <p>
              <span className="font-semibold">件名:</span> {formData.subject}
            </p>
            <p>
              <span className="font-semibold">優先度:</span> {formData.priority}
            </p>
            <p>
              <span className="font-semibold">興味:</span>{" "}
              {formData.interests.join(", ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="mt-4 px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors font-medium cursor-pointer"
          >
            別のお問い合わせを送る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Contact</h1>
        <button
          type="button"
          onClick={fillDebugData}
          className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors font-medium cursor-pointer"
        >
          🐛 デバッグ用データ入力
        </button>
      </div>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
        お問い合わせページです。フォームに入力してください。
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
          >
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            {...register("name")}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-shadow ${
              errors.name
                ? "border-red-500 dark:border-red-500 focus:ring-red-500"
                : "border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 dark:focus:ring-blue-600"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            {...register("email")}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-shadow ${
              errors.email
                ? "border-red-500 dark:border-red-500 focus:ring-red-500"
                : "border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 dark:focus:ring-blue-600"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Subject (Select) */}
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
          >
            件名 <span className="text-red-500">*</span>
          </label>
          <select
            id="subject"
            {...register("subject")}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-shadow ${
              errors.subject
                ? "border-red-500 dark:border-red-500 focus:ring-red-500"
                : "border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 dark:focus:ring-blue-600"
            }`}
          >
            <option value="">選択してください</option>
            <option value="general">一般的なお問い合わせ</option>
            <option value="support">サポート</option>
            <option value="sales">営業</option>
            <option value="other">その他</option>
          </select>
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.subject.message}
            </p>
          )}
        </div>

        {/* Priority (Radio) */}
        <div>
          <div className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
            優先度 <span className="text-red-500">*</span>
          </div>
          <div className="space-y-2">
            {[
              { value: "low", label: "低" },
              { value: "medium", label: "中" },
              { value: "high", label: "高" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer group"
              >
                <input
                  type="radio"
                  value={option.value}
                  {...register("priority")}
                  className="w-4 h-4 text-blue-600 border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
                <span className="ml-2 text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          {errors.priority && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.priority.message}
            </p>
          )}
        </div>

        {/* Interests (Checkbox) */}
        <div>
          <div className="block text-sm font-medium mb-3 text-zinc-700 dark:text-zinc-300">
            興味のある分野 <span className="text-red-500">*</span>
          </div>
          <div className="space-y-2">
            {[
              { value: "web", label: "Web開発" },
              { value: "mobile", label: "モバイルアプリ" },
              { value: "ai", label: "AI/機械学習" },
              { value: "cloud", label: "クラウド" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center cursor-pointer group"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  {...register("interests")}
                  className="w-4 h-4 text-blue-600 border-zinc-300 dark:border-zinc-700 rounded focus:ring-blue-500 dark:focus:ring-blue-600"
                />
                <span className="ml-2 text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          {errors.interests && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.interests.message}
            </p>
          )}
        </div>

        {/* Message */}
        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300"
          >
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            rows={4}
            {...register("message")}
            className={`w-full px-4 py-2 border rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 transition-shadow resize-none ${
              errors.message
                ? "border-red-500 dark:border-red-500 focus:ring-red-500"
                : "border-zinc-300 dark:border-zinc-700 focus:ring-blue-500 dark:focus:ring-blue-600"
            }`}
          />
          {errors.message && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.message.message}
            </p>
          )}
        </div>

        {/* Newsletter (Checkbox) */}
        <div>
          <label className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              {...register("newsletter")}
              className="w-4 h-4 text-blue-600 border-zinc-300 dark:border-zinc-700 rounded focus:ring-blue-500 dark:focus:ring-blue-600"
            />
            <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              ニュースレターを受け取る
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "送信中..." : "Send"}
        </button>
      </form>
    </div>
  );
}
