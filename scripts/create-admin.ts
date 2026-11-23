/**
 * Bootstrap or recover an admin account from a trusted machine.
 *
 *   npm run admin:create -- --email you@agency.in --name "Your Name"
 *   npm run admin:create -- --email you@agency.in --reset        # new password, unlock, sign out everywhere (keeps role)
 *   npm run admin:create -- --email ops@agency.in --name "Ops" --role ADMIN
 *
 * Password source, in order:
 *   1. ADMIN_PASSWORD environment variable (for automation; must meet the policy)
 *   2. hidden interactive prompt (when run in a terminal)
 *   3. otherwise a generated temporary password, printed once, that must be
 *      changed at first sign-in
 *
 * Requires roles to be seeded first (`npm run db:seed`). Never logs the
 * password except the generated temporary one, which is printed exactly once.
 */
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hash } from "@node-rs/argon2";
import { prisma } from "../prisma/seed/client";
import { ARGON2_OPTIONS } from "../src/server/auth/argon2-options";
import { emailSchema, passwordSchema } from "../src/lib/validation/auth";

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(value);
        }
        if (ch === "\u0003") {
          stdin.setRawMode(false);
          return reject(new Error("Cancelled"));
        }
        if (ch === "\u007f" || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

function temporaryPassword(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const out = [...randomBytes(18)].map((b) => alphabet[b % alphabet.length]).join("");
  return `${out.slice(0, 6)}-${out.slice(6, 12)}-${out.slice(12)}`;
}

function checkPolicy(password: string) {
  const result = passwordSchema.safeParse(password);
  if (!result.success) fail(`Password rejected: ${result.error.issues.map((i) => i.message).join(" ")}`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      role: { type: "string" },
      reset: { type: "boolean", default: false },
    },
  });

  const email = emailSchema.safeParse(values.email ?? "");
  if (!email.success) fail("Pass a valid --email.");

  const existing = await prisma.user.findUnique({
    where: { email: email.data },
    select: { id: true, role: { select: { key: true } } },
  });
  // A reset keeps the current role unless --role is passed explicitly.
  const roleKey = values.role ?? existing?.role.key ?? "SUPER_ADMIN";
  const role = await prisma.role.findUnique({ where: { key: roleKey }, select: { id: true, key: true } });
  if (!role) fail(`Role ${roleKey} not found. Run \`npm run db:seed\` first.`);

  if (existing && !values.reset) fail(`${email.data} already exists. Use --reset to set a new password.`);
  if (!existing && !values.name?.trim()) fail("Pass --name for a new account.");

  let password = process.env.ADMIN_PASSWORD;
  let mustChange = false;
  if (password) {
    checkPolicy(password);
  } else if (process.stdin.isTTY) {
    password = await promptHidden("Password (min 12 characters): ");
    checkPolicy(password);
    if ((await promptHidden("Repeat password: ")) !== password) fail("Passwords don't match.");
  } else {
    password = temporaryPassword();
    mustChange = true;
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          mustChangePassword: mustChange,
          passwordChangedAt: mustChange ? null : new Date(),
          status: "ACTIVE",
          failedLoginCount: 0,
          lockedUntil: null,
          ...(values.name?.trim() ? { name: values.name.trim() } : {}),
          roleId: role.id,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          email: email.data,
          name: values.name!.trim(),
          roleId: role.id,
          passwordHash,
          mustChangePassword: mustChange,
          passwordChangedAt: mustChange ? null : new Date(),
        },
        select: { id: true },
      });

  if (existing) {
    await prisma.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: existing ? "user.password_reset" : "user.created",
      entityType: "User",
      entityId: user.id,
      after: { role: role.key, via: "cli" },
    },
  });

  console.log(`✓ ${existing ? "Reset" : "Created"} ${email.data} (${role.key})`);
  if (mustChange) {
    console.log(`  Temporary password (shown once, must be changed at first sign-in): ${password}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
