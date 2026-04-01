<header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-sky-600 text-white rounded-md flex items-center justify-center font-semibold">
              A
            </div>
            <h1 className="text-lg font-semibold">My Tailwind Page</h1>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-6">
            <nav className="space-x-4 text-sm text-slate-600 hidden sm:block">
              <a className="hover:text-slate-900" href="#">Home</a>
              <a className="hover:text-slate-900" href="#">About</a>
              <a className="hover:text-slate-900" href="#">Contact</a>
            </nav>

            {/* USER SESSION */}
            {status === "loading" && (
              <div className="text-sm text-slate-500">Loading...</div>
            )}

            {!session && status !== "loading" && (
              <a
                href="/api/auth/signin"
                className="px-4 py-2 rounded-md bg-sky-600 text-white text-sm hover:bg-sky-700"
              >
                Sign in
              </a>
            )}

            {session && (
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 hover:bg-slate-50"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="user"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-sm font-semibold">
                      {session.user?.name?.charAt(0)}
                    </div>
                  )}

                  <span className="text-sm font-medium hidden sm:block">
                    {session.user?.name}
                  </span>
                </button>

                {/* DROPDOWN */}
                {open && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-slate-100">
                    <div className="px-4 py-2 text-xs text-slate-500">
                      {session.user?.email}
                    </div>
                    <hr />
                    <a
                      href="/profile"
                      className="block px-4 py-2 text-sm hover:bg-slate-50"
                    >
                      Profile
                    </a>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>