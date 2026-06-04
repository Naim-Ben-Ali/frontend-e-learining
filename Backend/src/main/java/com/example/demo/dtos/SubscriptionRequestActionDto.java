package com.example.demo.dtos;

import com.example.demo.models.SubscriptionRequestStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionRequestActionDto {
    private String requestId;
    private SubscriptionRequestStatus action; // APPROVED, DENIED, or BLOCKED
    private String responseMessage;
}
