import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h3 className="text-xl font-semibold mb-6 text-center">登录</h3>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
          }}>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-700">邮箱或用户名</span>
            <input
              className="border border-neutral-300 rounded-md px-3 py-2 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400"
              type="text"
              name="identifier"
              autoComplete="username"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-neutral-700">密码</span>
            <input
              className="border border-neutral-300 rounded-md px-3 py-2 outline-none focus:border-neutral-500 focus:ring-1 focus:ring-neutral-400"
              type="password"
              name="password"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-md bg-neutral-900 text-white px-3 py-2.5 text-sm font-medium hover:bg-neutral-800">
            登录
          </button>
        </form>
      </div>
    </div>
  )
}
