function calculatePolicy({
  bookDate,
  serviceDate,
  mangopayPolicyDays = 7,
  customerPolicyDays = 14,
  customerMinNoticeDays = 1,
  smartPolicyWeight = 0.34,
}) {
  const mangoPayPolicyMilliseconds = mangopayPolicyDays * 24 * 60 * 60 * 1000;
  const biambideroPolicyMilliseconds = customerPolicyDays * 24 * 60 * 60 * 1000;
  const minNoticePeriodMiliseconds =
    customerMinNoticeDays * 24 * 60 * 60 * 1000;
  const policyFrame = serviceDate - bookDate;

  /**
   * SMART CANCELLATION POLICY DATE
   */
  let optimizedPolicyDate;

  // Policy vs Weight (Smart Decision) | Smart Policy
  optimizedPolicyDate = Math.max(
    serviceDate.getTime() - policyFrame * smartPolicyWeight,
    serviceDate.getTime() - biambideroPolicyMilliseconds
  );

  // Smart Policy vs Notification Period | Policy Quaranteed
  optimizedPolicyDate = Math.min(
    optimizedPolicyDate,
    serviceDate - minNoticePeriodMiliseconds
  );

  // Policy Quaranteed vs Booking Date | Policy Quaranteed Sanitized
  optimizedPolicyDate = Math.max(optimizedPolicyDate, bookDate.getTime());

  /**
   * MANGOPAY CANCELLATION POLICY DATE
   */
  let mangopayPolicyDate;

  // Mangopay Policy | Mango Pay Policy
  mangopayPolicyDate = Math.min(
    bookDate.getTime() + mangoPayPolicyMilliseconds,
    optimizedPolicyDate
  );

  return {
    operationalFeeDeadlineDate: mangopayPolicyDate,
    cancellationFeeDeadlineDate: optimizedPolicyDate,
    fullPenaltyDeadlineDate: serviceDate - minNoticePeriodMiliseconds,
  };
}
