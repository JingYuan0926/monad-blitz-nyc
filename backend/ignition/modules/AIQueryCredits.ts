import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AIQueryCreditsModule", (m) => {
  const aiQueryCredits = m.contract("AIQueryCredits");

  return { aiQueryCredits };
});
