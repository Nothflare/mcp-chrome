import { createErrorResponse, ToolResult } from '@/common/tool-handler';
import { BaseBrowserToolExecutor } from '../base-browser';
import { TOOL_NAMES } from 'chrome-mcp-shared';

type TabGroupColor = 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange';

interface CreateTabGroupParams {
  tabIds: number[];
  title?: string;
  color?: TabGroupColor;
}

/**
 * Tool for creating a new tab group
 */
class CreateTabGroupTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.CREATE_TAB_GROUP;

  async execute(args: CreateTabGroupParams): Promise<ToolResult> {
    const { tabIds, title, color } = args;

    console.log(`Attempting to create tab group with tabs: ${tabIds.join(', ')}`);

    if (!tabIds || tabIds.length === 0) {
      return createErrorResponse('tabIds is required and must contain at least one tab ID');
    }

    try {
      // Verify that all tabIds exist
      const existingTabs = await Promise.all(
        tabIds.map(async (tabId) => {
          try {
            return await chrome.tabs.get(tabId);
          } catch (error) {
            console.warn(`Tab with ID ${tabId} not found`);
            return null;
          }
        }),
      );

      const validTabs = existingTabs.filter((tab): tab is chrome.tabs.Tab => tab !== null);
      const validTabIds = validTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

      if (validTabIds.length === 0) {
        return createErrorResponse('None of the provided tab IDs exist');
      }

      // Create the group
      const groupId = await chrome.tabs.group({ tabIds: validTabIds });
      console.log(`Created tab group with ID: ${groupId}`);

      // Update group properties if title or color is provided
      if (title !== undefined || color !== undefined) {
        const updateProps: chrome.tabGroups.UpdateProperties = {};
        if (title !== undefined) updateProps.title = title;
        if (color !== undefined) updateProps.color = color;

        await chrome.tabGroups.update(groupId, updateProps);
        console.log(`Updated tab group ${groupId} with title: ${title}, color: ${color}`);
      }

      // Get the final group info
      const group = await chrome.tabGroups.get(groupId);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Created tab group with ${validTabIds.length} tabs`,
              groupId: group.id,
              title: group.title,
              color: group.color,
              collapsed: group.collapsed,
              windowId: group.windowId,
              tabIds: validTabIds,
              invalidTabIds: tabIds.filter((id) => !validTabIds.includes(id)),
            }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in CreateTabGroupTool.execute:', error);
      return createErrorResponse(
        `Error creating tab group: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const createTabGroupTool = new CreateTabGroupTool();

interface UpdateTabGroupParams {
  groupId: number;
  title?: string;
  color?: TabGroupColor;
  collapsed?: boolean;
}

/**
 * Tool for updating an existing tab group
 */
class UpdateTabGroupTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.UPDATE_TAB_GROUP;

  async execute(args: UpdateTabGroupParams): Promise<ToolResult> {
    const { groupId, title, color, collapsed } = args;

    console.log(`Attempting to update tab group ${groupId}`);

    if (groupId === undefined || groupId === null) {
      return createErrorResponse('groupId is required');
    }

    try {
      // Verify the group exists
      try {
        await chrome.tabGroups.get(groupId);
      } catch (error) {
        return createErrorResponse(`Tab group with ID ${groupId} not found`);
      }

      // Build update properties
      const updateProps: chrome.tabGroups.UpdateProperties = {};
      if (title !== undefined) updateProps.title = title;
      if (color !== undefined) updateProps.color = color;
      if (collapsed !== undefined) updateProps.collapsed = collapsed;

      if (Object.keys(updateProps).length === 0) {
        return createErrorResponse('At least one property (title, color, or collapsed) must be provided to update');
      }

      // Update the group
      const updatedGroup = await chrome.tabGroups.update(groupId, updateProps);
      console.log(`Updated tab group ${groupId}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Updated tab group ${groupId}`,
              groupId: updatedGroup.id,
              title: updatedGroup.title,
              color: updatedGroup.color,
              collapsed: updatedGroup.collapsed,
              windowId: updatedGroup.windowId,
            }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in UpdateTabGroupTool.execute:', error);
      return createErrorResponse(
        `Error updating tab group: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const updateTabGroupTool = new UpdateTabGroupTool();

interface UngroupTabsParams {
  tabIds: number[];
}

/**
 * Tool for ungrouping tabs
 */
class UngroupTabsTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.UNGROUP_TABS;

  async execute(args: UngroupTabsParams): Promise<ToolResult> {
    const { tabIds } = args;

    console.log(`Attempting to ungroup tabs: ${tabIds?.join(', ')}`);

    if (!tabIds || tabIds.length === 0) {
      return createErrorResponse('tabIds is required and must contain at least one tab ID');
    }

    try {
      // Verify that all tabIds exist and are in a group
      const tabsInfo = await Promise.all(
        tabIds.map(async (tabId) => {
          try {
            const tab = await chrome.tabs.get(tabId);
            return { tabId, exists: true, groupId: tab.groupId };
          } catch (error) {
            console.warn(`Tab with ID ${tabId} not found`);
            return { tabId, exists: false, groupId: chrome.tabGroups.TAB_GROUP_ID_NONE };
          }
        }),
      );

      const validTabIds = tabsInfo
        .filter((info) => info.exists && info.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
        .map((info) => info.tabId);

      const notInGroupTabIds = tabsInfo
        .filter((info) => info.exists && info.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE)
        .map((info) => info.tabId);

      const invalidTabIds = tabsInfo.filter((info) => !info.exists).map((info) => info.tabId);

      if (validTabIds.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'No tabs to ungroup - none of the provided tabs are in a group',
                ungroupedCount: 0,
                notInGroupTabIds,
                invalidTabIds,
              }),
            },
          ],
          isError: false,
        };
      }

      // Ungroup the tabs
      await chrome.tabs.ungroup(validTabIds);
      console.log(`Ungrouped ${validTabIds.length} tabs`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Ungrouped ${validTabIds.length} tabs`,
              ungroupedCount: validTabIds.length,
              ungroupedTabIds: validTabIds,
              notInGroupTabIds,
              invalidTabIds,
            }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in UngroupTabsTool.execute:', error);
      return createErrorResponse(
        `Error ungrouping tabs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const ungroupTabsTool = new UngroupTabsTool();

interface MoveTabsToGroupParams {
  tabIds: number[];
  groupId: number;
}

/**
 * Tool for moving tabs to an existing group
 */
class MoveTabsToGroupTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.MOVE_TABS_TO_GROUP;

  async execute(args: MoveTabsToGroupParams): Promise<ToolResult> {
    const { tabIds, groupId } = args;

    console.log(`Attempting to move tabs ${tabIds?.join(', ')} to group ${groupId}`);

    if (!tabIds || tabIds.length === 0) {
      return createErrorResponse('tabIds is required and must contain at least one tab ID');
    }

    if (groupId === undefined || groupId === null) {
      return createErrorResponse('groupId is required');
    }

    try {
      // Verify the group exists
      let targetGroup: chrome.tabGroups.TabGroup;
      try {
        targetGroup = await chrome.tabGroups.get(groupId);
      } catch (error) {
        return createErrorResponse(`Tab group with ID ${groupId} not found`);
      }

      // Verify that all tabIds exist
      const existingTabs = await Promise.all(
        tabIds.map(async (tabId) => {
          try {
            return await chrome.tabs.get(tabId);
          } catch (error) {
            console.warn(`Tab with ID ${tabId} not found`);
            return null;
          }
        }),
      );

      const validTabs = existingTabs.filter((tab): tab is chrome.tabs.Tab => tab !== null);
      const validTabIds = validTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined);

      if (validTabIds.length === 0) {
        return createErrorResponse('None of the provided tab IDs exist');
      }

      // Move tabs to the group
      await chrome.tabs.group({ tabIds: validTabIds, groupId });
      console.log(`Moved ${validTabIds.length} tabs to group ${groupId}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Moved ${validTabIds.length} tabs to group "${targetGroup.title || groupId}"`,
              groupId,
              groupTitle: targetGroup.title,
              movedCount: validTabIds.length,
              movedTabIds: validTabIds,
              invalidTabIds: tabIds.filter((id) => !validTabIds.includes(id)),
            }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in MoveTabsToGroupTool.execute:', error);
      return createErrorResponse(
        `Error moving tabs to group: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const moveTabsToGroupTool = new MoveTabsToGroupTool();

interface ListTabGroupsParams {
  windowId?: number;
}

/**
 * Tool for listing all tab groups
 */
class ListTabGroupsTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.LIST_TAB_GROUPS;

  async execute(args: ListTabGroupsParams): Promise<ToolResult> {
    const { windowId } = args;

    console.log(`Attempting to list tab groups${windowId !== undefined ? ` in window ${windowId}` : ''}`);

    try {
      // Query tab groups
      const queryInfo: chrome.tabGroups.QueryInfo = {};
      if (windowId !== undefined) {
        queryInfo.windowId = windowId;
      }

      const groups = await chrome.tabGroups.query(queryInfo);

      // Get tabs for each group to provide more context
      const groupsWithTabs = await Promise.all(
        groups.map(async (group) => {
          const tabs = await chrome.tabs.query({ groupId: group.id });
          return {
            groupId: group.id,
            title: group.title,
            color: group.color,
            collapsed: group.collapsed,
            windowId: group.windowId,
            tabCount: tabs.length,
            tabs: tabs.map((tab) => ({
              tabId: tab.id,
              title: tab.title,
              url: tab.url,
            })),
          };
        }),
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              groupCount: groups.length,
              groups: groupsWithTabs,
            }),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in ListTabGroupsTool.execute:', error);
      return createErrorResponse(
        `Error listing tab groups: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const listTabGroupsTool = new ListTabGroupsTool();
