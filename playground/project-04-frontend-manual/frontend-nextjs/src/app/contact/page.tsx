export default function Contact() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Contact</h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
        お問い合わせページです。
      </p>
      <form className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Name
          </label>
          <input
            type="text"
            id="name"
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-shadow"
          />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">
            Message
          </label>
          <textarea
            id="message"
            rows={4}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-shadow resize-none"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20"
        >
          Send
        </button>
      </form>
    </div>
  );
}
