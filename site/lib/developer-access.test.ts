import { expect, it } from "vitest";
import { hasDeveloperAccess } from "./developer-access";
it("requires the developer account with active organizer access", () => {
  expect(hasDeveloperAccess({discordId:"311247030422863882",isAdmin:true})).toBe(true);
  for (const user of [null,undefined,{discordId:"311247030422863882",isAdmin:false},
    {discordId:"553265835335090177",isAdmin:true},{discordId:"0",isAdmin:true}]) {
    expect(hasDeveloperAccess(user)).toBe(false);
  }
});
