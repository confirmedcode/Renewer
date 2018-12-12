# Renewer Server

This is a private Node.js server that runs subscription updates once daily. It only runs updates for subscriptions whose `expiration_date` are a few days before and after the current date.

The `expiration_date` date range that Renewer checks daily are determined by the Parameter Store values in `START_DAYS_AGO` and `END_DAYS_LATER`. For example, if these values are 2 and 5 respectively, and the current date is October 8th, then all subscription rows in the database with `expiration_date` of October 6th to October 13th will be updated.

Subscriptions in the database need to be updated daily in order to track status changes of user subscriptions. For example, if a user renews their iOS subscription, Renewer updates the that user's subscription entry in our database so that we continue to allow the user access to the VPN service.

Renewer can also be manually triggered to update a specific set of subscriptions, described in the APIs below. 

### AWS Prerequisites

* Run the Renewer [CloudFormation](https://github.com/confirmedcode/Server-CloudFormation) and all its prerequisites
* (For Manual Usage) Add your machine's IP to the Inbound rules of the Renewer instance's Security Group

## Automatic Usage

Once deployed, every day at __12:50 UTC__ the Renewer updates all subscription rows with `expiration_date` between the `START_DAYS_AGO` and `END_DAYS_LATER` date range.

### Reporting
Basic counts of successful and failed updates are published to CloudWatch Metrics. Detailed logs of updates are published to CloudWatch Logs.

## Manual Usage

### Update Subscriptions in Default Range
Updates all subscription rows with `expiration_date` between the `START_DAYS_AGO` and `END_DAYS_LATER` date range.

__Request__

```
GET /renew
```

__Response__

```
Status: 200 OK
{
	message: OK
}
```

### Update All Subscriptions

__Request__

```
GET /renew-all
```

__Response__

```
Status: 200 OK
{
	message: OK
}
```

### Update One User's Subscriptions
__Request__

```
GET /renew-user
```

Name | Type | Description
--- | --- | ---
`id`| `string` | __Required__ The ID of the user whose subscriptions you wish to update.

__Response__

```
Status: 200 OK
{
	message: [id] check started.
}
```

### Update Failed Checks

__Request__

```
GET /renew-all
```

__Response__

```
Status: 200 OK
{
	message: Failed check started.
}
```

### Health Check
__Request__

```
GET /health
```

__Response__

```
Status: 200 OK
{
	message: OK
}
```

## Feedback
If you have any questions, concerns, or other feedback, please let us know any feedback in Github issues or by e-mail.

We also have a bug bounty program that can be found here: https://hackerone.com/confirmed_inc

## License

This project is licensed under the GPL License - see the [LICENSE.md](LICENSE.md) file for details

## Contact

<engineering@confirmedvpn.com>