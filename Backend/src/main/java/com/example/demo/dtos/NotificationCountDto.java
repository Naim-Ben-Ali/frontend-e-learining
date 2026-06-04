package com.example.demo.dtos;

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
public class NotificationCountDto {
    private long pendingRequests; // For teachers - unread subscription requests
    private long pendingResponses; // For students - unread teacher responses
    private long totalNotifications;
}
