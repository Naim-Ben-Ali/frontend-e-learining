package com.example.demo.dtos;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class TeacherCalendarBulkActionRequest {

    public enum ActionType {
        MOVE_NEXT_WEEK,
        UPDATE_MEETING_LINK,
        CANCEL_AND_NOTIFY
    }

    @NotEmpty
    private List<String> eventIds;

    @NotNull
    private ActionType actionType;

    private String meetingLink;

    private String notifyPolicy;
}
