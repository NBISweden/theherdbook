library(optiSel)
library(nprcgenekeepr)
library(DBI)
library(digest)

#Only load the environment one
pg_host   <- Sys.getenv("POSTGRES_HOST", "localhost")
pg_dbname <- Sys.getenv("POSTGRES_DBNAME", "herdbook")
pg_port   <- Sys.getenv("POSTGRES_PORT", "5432")
pg_user   <- Sys.getenv("POSTGRES_USER", "herdbook")
pg_passw  <- Sys.getenv("POSTGRES_PASSWORD", "insecure")

# Returns a connection instance to a PG server
connect_to_pg <- function() {
  con <- dbConnect(RPostgres::Postgres(),dbname = get("pg_dbname"),
                   host = get("pg_host"),
                   port = get("pg_port"),
                   user = get("pg_user"),
                   password = get("pg_passw"))
  return (con)
}

# Terminates a connection to a PG server
disconnect_from_pg <- function(con) {
  dbDisconnect(con)
}


#Get available genebank ids in the database
get_all_genebanks <- function(con) {
  res <- dbSendQuery(con, "select genebank_id, name from genebank;")
  genebanks <- dbFetch(res)
  dbClearResult(res)
  return (genebanks)
}

#Return the digest of the current individuals in the corresponding genebank if this changes we know we need to recalculate
get_modifications_digest <- function(con,genebank_id){
  res <- dbSendQuery(con, paste0("select i.number FROM individual i JOIN herd h ON (i.origin_herd_id = h.herd_id) WHERE h.genebank_id=",genebank_id)) 
  individuals <- dbFetch(res)
  dbClearResult(res)
  return (digest(individuals))
}

# Returns a data structure with selected individuals' ancestry information for genebank_id 
# 1 Gotlandskanin 2, Mellerud
#Format as pedigre using optiSel library

get_rabbits<-function(con,genebank_id){
  rabbits <- get_all_individuals(con,genebank_id)
  names(rabbits)<-c("Indiv","Sire","Dam","Sex", "Born", "is_active")
  rabbits$Born_date<-rabbits$Born
  rabbits$Born<-format(rabbits$Born_date, format="%Y")
  Pedi <- optiSel::prePed(rabbits)
  return(Pedi)
}


#Human readable version of all animals from the given genebank_id
get_all_individuals <- function(con,genebank_id) {
  res <- dbSendQuery(con, paste0("SELECT      i.number as Indiv, f.number as Sire, m.number as Dam, i.sex as Sex, i.birth_date as Born, 
            (i.death_date IS NULL
             AND (i.death_note = '' OR i.death_note IS NULL)
             AND ih.herd_tracking_date > current_date - interval '1 year') AS is_active
FROM        individual i
LEFT JOIN   individual f ON (i.father_id = f.individual_id)
LEFT JOIN   individual m ON (i.mother_id = m.individual_id)
JOIN        (
                SELECT DISTINCT ON (individual_id)
                         individual_id,
                         herd_id,
                         herd_tracking_date
                FROM     herd_tracking
                ORDER BY individual_id, herd_tracking_date DESC
            ) AS ih ON (ih.individual_id = i.individual_id)
JOIN        herd h ON (ih.herd_id = h.herd_id)
WHERE       h.genebank_id =",genebank_id))
  individuals <- dbFetch(res)
  dbClearResult(res)
  return (individuals)
  
}


# Function to Preload data on startup 
update_preload_all_data <- function() {
  con <- connect_to_pg()
  genebanks<<-get_all_genebanks(con)
  for(i in genebanks$genebank_id){
    assign(paste0("MOD_",i),get_modifications_digest(con,i),envir = .GlobalEnv)
    update_data(con,i)
  }
  dbDisconnect(con)
}


#Update and calculate the Kinship matrix and inbreeding
update_data <- function(con,genebank_id) {
  Pedi<-get_rabbits(con,genebank_id)
  #Calculate Inbreeding and name it after genebank_id
  assign(paste0("IDB_",genebank_id),data.frame(number=Pedi[,1], Inbr=pedigree::calcInbreeding(Pedi[,1:3]), stringsAsFactors = FALSE),envir = .GlobalEnv)
  #Get current active population
  keep<-Pedi[Pedi$is_active == "TRUE",]$Indiv
  #Calculate Kinship of current population and return Kinship matrix and Meankinship
  assign(paste0("KIN_",genebank_id),optiSel::pedIBD(Pedi,keep.only=keep),envir = .GlobalEnv)
  assign(paste0("MK_",genebank_id),colMeans(get(paste0("KIN_",genebank_id))),envir = .GlobalEnv)
}

#* @serializer csv
#* @get /kinship/<genebank_id:int>
calculate_kinship <- function(genebank_id, update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db){
    con <- connect_to_pg()
    MOD_change<-get_modifications_digest(con,genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(con,genebank_id)
    }
    dbDisconnect(con)
  }
  return(as.data.frame(get(paste0("KIN_",genebank_id))))
}

calculateFEFG <- function() {
  Pedi<-get_rabbits(genebank_id)
  ped<- data.frame(
    id = Pedi$Indiv,
    sire = Pedi$Sire,
    dam = Pedi$Dam,
    stringsAsFactors = TRUE)
  ped["gen"] <- findGeneration(ped$id, ped$sire, ped$dam)
  ped$population <- getGVPopulation(ped, keep)
  fe <- calcFE(ped)
  allelesFactors <- geneDrop(ped$id, ped$sire, ped$dam, ped$gen,, genotype = NULL, n = 5000, updateProgress = NULL)
} 


#* @get /update-db/
update_data_cron <- function() {
  con <- connect_to_pg()
  for(i in genebanks$genebank_id){
    MOD_change<-get_modifications_digest(con,i)
    if(get(paste0("MOD_",i))!= MOD_change)
    {
      assign(paste0("MOD_",i),MOD_change,envir = .GlobalEnv)
      update_data(con,i)
      print(paste0("Updated genebank id: ",i))
    }
  }
  dbDisconnect(con)
}

#* @serializer csv
#* @get /inbreeding/<genebank_id:int>
inbreeding <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    con <- connect_to_pg()
    MOD_change<-get_modifications_digest(con,genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(con,genebank_id)
    }
    dbDisconnect(con)
  }
  return (get(paste0("IDB_",genebank_id)))
}


#* @serializer csv
#* @get /meankinship/<genebank_id:int>
meankinship <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    con <- connect_to_pg()
    MOD_change<-get_modifications_digest(con,genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(con,genebank_id)
    }
    dbDisconnect(con)
  }
  return(
    data.frame(number=names(get(paste0("MK_",genebank_id))), MK=get(paste0("MK_",genebank_id)), row.names=NULL)
  )
  
}


#RUN stuff and preload
update_preload_all_data()

