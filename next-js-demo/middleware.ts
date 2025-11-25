import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isUserAdmin, getUserById, createUser } from "./lib/supabase-admin";

// TODO: Uncomment when admin dashboard is ready
// const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Auto-create user in Supabase if authenticated and doesn't exist
  if (userId) {
    try {
      const existingUser = await getUserById(userId);

      if (!existingUser) {
        // User doesn't exist in Supabase, create them
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);

        const email =
          clerkUser.emailAddresses.find(
            (e) => e.id === clerkUser.primaryEmailAddressId
          )?.emailAddress || clerkUser.emailAddresses[0]?.emailAddress;

        const fullName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim();

        if (email) {
          await createUser(userId, email, fullName || undefined);
          console.log(`Created Supabase user for: ${email}`);
        }
      }
    } catch (error) {
      console.error("Error syncing user to Supabase:", error);
      // Don't block the request if user creation fails
    }
  }

  // TODO: Uncomment when admin dashboard is ready
  // // Check if this is an admin route
  // if (isAdminRoute(req)) {
  //   // Require authentication
  //   if (!userId) {
  //     const signInUrl = new URL("/sign-in", req.url);
  //     signInUrl.searchParams.set("redirect_url", req.url);
  //     return NextResponse.redirect(signInUrl);
  //   }

  //   // Check if user is admin
  //   const isAdmin = await isUserAdmin(userId);
  //   if (!isAdmin) {
  //     // Redirect non-admins to home page
  //     return NextResponse.redirect(new URL("/", req.url));
  //   }
  // }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
