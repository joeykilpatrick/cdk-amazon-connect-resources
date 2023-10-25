import * as Lambda from 'aws-cdk-lib/aws-lambda';
import * as Connect from 'aws-cdk-lib/aws-connect';
import {Construct} from 'constructs';


export class ConnectLambdaFunction extends Lambda.Function {

    constructor(
        scope: Construct,
        id: string,
        private props: Lambda.FunctionProps & { connectInstance: Connect.CfnInstance },
    ) {
        super(scope, id, props);
    }

    public readonly connectInstanceAssociation = new Connect.CfnIntegrationAssociation(this, 'functionAssociation', {
        integrationType: "LAMBDA_FUNCTION",
        integrationArn: this.functionArn,
        instanceId: this.props.connectInstance.attrId,
    });

}
