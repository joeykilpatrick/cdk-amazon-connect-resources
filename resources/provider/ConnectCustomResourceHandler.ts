import type {
    CloudFormationCustomResourceEvent,
    CloudFormationCustomResourceResponse
} from "aws-lambda";

import {ResourceType} from ".";
import {
    ConnectAgentStatus,
    ConnectEnabledInstanceAttribute,
    ConnectExistingInstance,
    ConnectExistingPrompt,
    ConnectExistingPhoneNumber,
    ConnectExistingTrafficDistributionGroup,
    ConnectLambdaFunctionAssociation,
    ConnectPhoneNumberContactFlowAssociation,
} from "..";

export async function handler(event: CloudFormationCustomResourceEvent): Promise<CloudFormationCustomResourceResponse> {

    const resourceType = ((): ResourceType => {
        const regexResults = /^Custom::(.*)$/.exec(event.ResourceType);
        if (!regexResults) {
            throw Error(`Unexpected ResourceType format: "${event.ResourceType}"`);
        }

        const result = regexResults[1]!; // Assertion guaranteed by regex

        return result as ResourceType; // TODO Could do validation here
    })();

    type Handler = (event: CloudFormationCustomResourceEvent) => Promise<CloudFormationCustomResourceResponse>;

    const handlers: Record<ResourceType, Handler> = {
        [ResourceType.AGENT_STATUS]: ConnectAgentStatus.handleCloudFormationEvent,
        [ResourceType.ENABLED_INSTANCE_ATTRIBUTE]: ConnectEnabledInstanceAttribute.handleCloudFormationEvent,
        [ResourceType.EXISTING_INSTANCE]: ConnectExistingInstance.handleCloudFormationEvent,
        [ResourceType.EXISTING_PROMPT]: ConnectExistingPrompt.handleCloudFormationEvent,
        [ResourceType.EXISTING_PHONE_NUMBER]: ConnectExistingPhoneNumber.handleCloudFormationEvent,
        [ResourceType.EXISTING_TRAFFIC_DISTRIBUTION_GROUP]: ConnectExistingTrafficDistributionGroup.handleCloudFormationEvent,
        [ResourceType.LAMBDA_FUNCTION_ASSOCIATION]: ConnectLambdaFunctionAssociation.handleCloudFormationEvent,
        [ResourceType.PHONE_NUMBER_CONTACT_FLOW_ASSOCIATION]: ConnectPhoneNumberContactFlowAssociation.handleCloudFormationEvent,
    };

    return await handlers[resourceType](event);

}
