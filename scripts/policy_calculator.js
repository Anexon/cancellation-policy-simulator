const dateInput = document.querySelector("#serviceDateInput");
let defaultServiceDate = new Date();
let minServiceDate = new Date();
defaultServiceDate.setDate(defaultServiceDate.getDate() + 21);
minServiceDate.setDate(defaultServiceDate.getDate() + 1);
defaultServiceDate.setMinutes(
  defaultServiceDate.getMinutes() - defaultServiceDate.getTimezoneOffset()
);
minServiceDate.setMinutes(
  minServiceDate.getMinutes() - minServiceDate.getTimezoneOffset()
);
dateInput.min = minServiceDate.toISOString().slice(0, 16);
dateInput.value = defaultServiceDate.toISOString().slice(0, 16);

dateInput.addEventListener("change", (event) => {
  recalculate(new Date(event.target.value));
});

recalculate(defaultServiceDate);

function recalculate(newServiceDate = new Date()) {
  const bookDate = new Date();
  const serviceDate = newServiceDate;
  const policyFrame = serviceDate - bookDate;
  const {
    operationalFeeDeadlineDate,
    cancellationFeeDeadlineDate,
    fullPenaltyDeadlineDate,
  } = calculatePolicy({ bookDate, serviceDate });

  const maxWidth = 1050;

  // Cleanup
  document.querySelector("#segment-container").innerHTML = "";

  // FREE CANCELLATION
  appendSegment(
    (operationalFeeDeadlineDate - bookDate.getTime()) / (24 * 3600000),
    "Cancellation Free",
    "free",
    bookDate,
    ((operationalFeeDeadlineDate - bookDate.getTime()) * maxWidth) / policyFrame
  );

  // MANGOPAY
  appendSegment(
    (cancellationFeeDeadlineDate - operationalFeeDeadlineDate) / (24 * 3600000),
    "Operational Fee",
    "mangopay",
    operationalFeeDeadlineDate,
    (1 -
      (serviceDate.getTime() -
        cancellationFeeDeadlineDate +
        operationalFeeDeadlineDate -
        bookDate.getTime()) /
        policyFrame) *
      maxWidth
  );

  // CUSTOMER POLICY
  appendSegment(
    (fullPenaltyDeadlineDate - cancellationFeeDeadlineDate) / (24 * 3600000),
    "Customer Policy Fee",
    "customer-policy",
    cancellationFeeDeadlineDate,
    ((fullPenaltyDeadlineDate - cancellationFeeDeadlineDate) * maxWidth) /
      policyFrame
  );

  // FULL PENALTY POLICY
  appendSegment(
    (serviceDate.getTime() - fullPenaltyDeadlineDate) / (24 * 3600000),
    "Full Penalty Fee",
    "full-penalty",
    fullPenaltyDeadlineDate,
    ((serviceDate.getTime() - fullPenaltyDeadlineDate) * maxWidth) / policyFrame
  );

  // Add Service Date
  appendServiceDateDot(serviceDate);

  const cancellationDatePicker = document.querySelector(
    "#cancellationDatePicker"
  );
  const cancellationDateMarker = document.querySelector("#cancellation-marker");
  const cancellationDate = document.querySelector("#cancellation-date");
  cancellationDate.innerHTML = `${
    bookDate.toISOString().split("T")[0]
  }<p>${bookDate
    .toISOString()
    .split("T")[1]
    .split("Z")[0]
    .slice(0, 5)}</p><p>${evaluateDate(bookDate)}</p>`;

  cancellationDatePicker.addEventListener("input", (event) => {
    cancellationDateMarker.style.left = `${event.target.value - 1}px`;
    let cancellationDatePicker =
      bookDate.getTime() + (policyFrame / maxWidth) * (event.target.value - 1);
    let auxDateString = new Date(cancellationDatePicker).toISOString();
    cancellationDate.innerHTML = `${
      auxDateString.split("T")[0]
    }<p>${auxDateString
      .split("T")[1]
      .split("Z")[0]
      .slice(0, 5)}</p><p>${evaluateDate(
      new Date(cancellationDatePicker)
    )}</p>`;
  });

  function evaluateDate(date) {
    let result = "No Cancellation Fee";
    if (date >= operationalFeeDeadlineDate) {
      result = '<span style="font-weight: bold;">Operational Fee</span>';
    } else {
      result = '<span style="font-weight: bold;">No Cancellation Fee</span>';
    }
    if (date >= cancellationFeeDeadlineDate) {
      result =
        '<span style="font-weight: bold;">Customer Policy Fee + Operational Fee</span>';
    }
    if (date >= fullPenaltyDeadlineDate) {
      result = '<span style="font-weight: bold;">Full Penalty</span>';
    }
    return result;
  }

  function calculatePolicy({
    bookDate,
    serviceDate,
    mangopayPolicyDays = 7,
    customerPolicyDays = 14,
    customerMinNoticeDays = 1,
    smartPolicyWeight = 0.34,
  }) {
    console.log("Calculating date");
    const mangoPayPolicyMilliseconds = mangopayPolicyDays * 24 * 60 * 60 * 1000;
    const biambideroPolicyMilliseconds =
      customerPolicyDays * 24 * 60 * 60 * 1000;
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

  function cleanUpDate(date) {
    let dateString = new Date(date).toISOString();
    return `${dateString.split("T")[0]}<br>${dateString
      .split("T")[1]
      .split("Z")[0]
      .slice(0, 5)}`;
  }

  function appendSegment(
    segmentLength,
    segmentTitle,
    segmentType,
    segmentDate,
    calculatedSegmentWeight
  ) {
    let container = document.querySelector("#segment-container");
    let segment = document.createElement("div");
    let segmentDateElement = document.createElement("div");
    segment.setAttribute("class", `segment ${segmentType}`);
    segment.style.width = `${calculatedSegmentWeight}px`;
    segment.innerHTML = `${segmentLength.toFixed(2)}<p>${segmentTitle}</p>`;
    segmentDateElement.setAttribute("class", `segment-date left`);
    segmentDateElement.innerHTML = `${cleanUpDate(
      segmentDate
    )}<div class="dot"></div>`;

    if (segmentLength === 0) {
      segment.style.display = "none";
    }

    segment.append(segmentDateElement);
    container.append(segment);
  }

  function appendServiceDateDot(date) {
    let segment = document.querySelector("div.full-penalty");
    let segmentDateElement = document.createElement("div");
    segmentDateElement.setAttribute("class", `segment-date right`);
    segmentDateElement.innerHTML = `${cleanUpDate(
      date
    )}<div class="dot"></div>`;
    segment.append(segmentDateElement);
  }
}
